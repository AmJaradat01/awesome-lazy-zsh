class AwesomeLazyZsh < Formula
  desc "Comprehensive Zsh environment manager with plugins, themes, and profiles"
  homepage "https://github.com/AmJaradat01/awesome-lazy-zsh"
  url "https://github.com/AmJaradat01/awesome-lazy-zsh/archive/v3.0.3.tar.gz"
  sha256 "8f709265b1696c1b813a77f1142c6e85db85259f0c82311b264bc6c43b88db96"
  license "MIT"

  depends_on "node"
  depends_on "git"

  def install
    # Install supporting files
    libexec.install Dir["*"]
    
    # Create wrapper script that runs from the installed location
    (bin/"awesome-lazy-zsh").write <<~EOS
      #!/bin/bash
      cd "#{libexec}" && exec ./setup.sh "$@"
    EOS
  end

  test do
    # Test that the script exists and is executable
    assert_predicate bin/"awesome-lazy-zsh", :exist?
    assert_predicate bin/"awesome-lazy-zsh", :executable?
  end
end